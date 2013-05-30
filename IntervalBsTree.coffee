###
Interval Tree

Based on
[1] BSTree https://github.com/mauriciosantos/buckets
[2] Introduction to algorithms / Thomas H. Cormen . . . [et al.].—3rd ed., The MIT Press, ISBN 978-0-262-03384-8
        Section 14.3: Interval trees, pp. 348–354
[3] http://en.wikipedia.org/wiki/Interval_tree#Augmented_tree
###

# Interval values are expected to be in form of {low: 3, high: 10, ...}
intervalComparator = (a, b) ->
    if a.low < b.low
        -1
    else if a.low > b.low
        1
    else
        if a.high < b.high
            -1
        else if a.high > b.high
            1
        else
            0

Ext.define 'Sch.lib.IntervalBsTree',
    root: null
    comparator: intervalComparator
    
    statics:
        createInterval: (low, high, tag) ->
            low: low
            high: high
            tag: tag
    
    constructor: () ->
        @

    add: (interval) ->
        return false unless interval
        node =
            interval: interval
            max: interval.high
            left: null
            right: null
            parent: null

        @_insertNode(node) isnt null

    query: (point) ->
        result = []
        node = @root
        prev = null
        current = undefined
        interval = undefined
        while node?
            current = node
            if prev is node.parent
                if point > node.max
                    node = current.parent
                    prev = current
                    continue
                if node.left?
                    node = current.left
                    prev = current
                    continue
                interval = node.interval
                if point < interval.low
                    node = current.parent
                    prev = current
                    continue
                result.push interval if point <= interval.high
                node = (if (node.right?) then current.right else current.parent)
                prev = current
                continue
            else
                if prev is node.left
                    interval = node.interval
                    if point < interval.low
                        node = current.parent
                        prev = current
                        continue
                    result.push interval if point <= interval.high
                    if node.right?
                        node = current.right
                        prev = current
                        continue
                node = current.parent
                prev = current
                continue
        result

    _insertNode: (node) ->
        if @root is null
            @root = node
            return node
        position = @root
        cmp = null
        loop
            cmp = @comparator(node.interval, position.interval)
            if cmp is 0
                return null
            else if cmp < 0
                if position.left is null
                    node.parent = position
                    position.left = node
                    @_updateMax node
                    return node
                else
                    position = position.left
            else
                if position.right is null
                    node.parent = position
                    position.right = node
                    @_updateMax node
                    return node
                else
                    position = position.right

    _updateMax: (node) ->
        node.max = Math.max(node.interval.high, (if node.left then node.left.max else (-Number.MAX_VALUE)), (if node.right then node.right.max else (-Number.MAX_VALUE)))
        @_updateMax node.parent if node.parent and node.parent.max < node.max

    _searchNode: (node, interval) ->
        cmp = null
        while node isnt null and cmp isnt 0
            cmp = @comparator(interval, node.interval)
            if cmp < 0
                node = node.left
            else node = node.right if cmp > 0
        node

    _transplant: (n1, n2) ->
        if n1.parent is null
            @root = n2
        else if n1 is n1.parent.left
            n1.parent.left = n2
        else
            n1.parent.right = n2
        if n2 isnt null
            n2.parent = n1.parent
            @_updateMax n2.parent if n2.parent isnt null

    _minimumAux: (node) ->
        node = node.left    while node.left isnt null
        node

    _maximumAux: (node) ->
        node = node.right    while node.right isnt null
        node

    _successorNode: (node) ->
        return @_minimumAux(node.right) if node.right isnt null
        successor = node.parent
        while successor isnt null and node is successor.right
            node = successor
            successor = node.parent
        successor

    _heightAux: (node) ->
        return -1 if node is null
        Math.max(@_heightAux(node.left), @_heightAux(node.right)) + 1

    _removeNode: (node) ->
        if node.left is null
            @_transplant node, node.right
        else if node.right is null
            @_transplant node, node.left
        else
            y = @_minimumAux(node.right)
            if y.parent isnt node
                @_transplant y, y.right
                y.right = node.right
                y.right.parent = y
                @_updateMax y
            @_transplant node, y
            y.left = node.left
            y.left.parent = y
            @_updateMax y

    _inorderTraversalAux: (node, callback, signal) ->
        return if node is null or signal.stop
        @_inorderTraversalAux node.left, callback, signal
        return if signal.stop
        signal.stop = callback(node.interval) is false
        return if signal.stop
        @_inorderTraversalAux node.right, callback, signal

    _preorderTraversalAux: (node, callback, signal) ->
        return if node is null or signal.stop
        signal.stop = callback(node.interval) is false
        return if signal.stop
        @_preorderTraversalAux node.left, callback, signal
        return if signal.stop
        @_preorderTraversalAux node.right, callback, signal

    _postorderTraversalAux: (node, callback, signal) ->
        return if node is null or signal.stop
        @_postorderTraversalAux node.left, callback, signal
        return if signal.stop
        @_postorderTraversalAux node.right, callback, signal
        return if signal.stop
        signal.stop = callback(node.interval) is false

    clear: () ->
        @root = null

    isEmpty: () ->
        @root is null

    contains: (interval) ->
        return false unless interval
        @_searchNode(@root, interval) isnt null

    remove: (interval) ->
        node = @_searchNode(@root, interval)
        return false if node is null
        @_removeNode node
        true

    inorderTraversal: (callback) ->
        @_inorderTraversalAux @root, callback,
            stop: false

    preorderTraversal: (callback) ->
        @_preorderTraversalAux @root, callback,
            stop: false

    postorderTraversal: (callback) ->
        @_postorderTraversalAux @root, callback,
            stop: false

    minimum: () ->
        return undefined if @isEmpty()
        @_minimumAux(@root).interval

    maximum: () ->
        return undefined if @isEmpty()
        @_maximumAux(@root).interval

    forEach: (callback) ->
        @inorderTraversal callback

    toArray: () ->
        array = []
        @inorderTraversal (interval) ->
            array.push interval
        array

    height: () ->
        @_heightAux @root
